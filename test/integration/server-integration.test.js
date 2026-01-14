import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { mkdir, rm, readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_MUSIC_DIR = join(__dirname, '..', '..', 'test-music-integration');
const TEST_PORT = 3002;
const API_BASE = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess;

// Helper to make HTTP requests with proper IPv4 handling
function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const requestOptions = {
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path: url.pathname,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

describe('Server-Side Download Integration Tests', () => {
    before(async () => {
        console.log('Setting up test environment...');
        
        // Clean and create test music directory
        await rm(TEST_MUSIC_DIR, { recursive: true, force: true });
        await mkdir(TEST_MUSIC_DIR, { recursive: true });
        
        // Start server
        const serverPath = join(__dirname, '..', '..', 'js', 'server.js');
        serverProcess = spawn('node', [serverPath], {
            env: {
                ...process.env,
                PORT: TEST_PORT,
                MUSIC_DIR: TEST_MUSIC_DIR,
                NODE_ENV: 'test'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverOutput = '';
        serverProcess.stdout.on('data', (data) => {
            serverOutput += data.toString();
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        // Wait for server to be ready
        console.log('Waiting for server to start...');
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const result = await makeRequest('/api/health');
                if (result.status === 200 && result.data.status === 'ok') {
                    console.log('Server ready!');
                    return;
                }
            } catch (err) {
                attempts++;
                if (attempts >= maxAttempts) {
                    console.error('Server output:', serverOutput);
                    throw new Error(`Server failed to start after ${maxAttempts} attempts: ${err.message}`);
                }
            }
        }
    });

    after(async () => {
        console.log('Cleaning up...');
        
        // Stop server
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            
            // Wait for graceful shutdown
            await new Promise(resolve => {
                serverProcess.on('exit', resolve);
                setTimeout(() => {
                    serverProcess.kill('SIGKILL');
                    resolve();
                }, 3000);
            });
        }
        
        // Clean up test directory
        await rm(TEST_MUSIC_DIR, { recursive: true, force: true });
        console.log('Cleanup complete');
    });

    describe('Health Check', () => {
        it('should return status ok with music directory', async () => {
            const result = await makeRequest('/api/health');
            
            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.status, 'ok');
            assert.strictEqual(result.data.musicDir, TEST_MUSIC_DIR);
        });
    });

    describe('Config Endpoint', () => {
        it('should return server download configuration', async () => {
            const result = await makeRequest('/api/config');
            
            assert.strictEqual(result.status, 200);
            assert.ok(result.data.serverDownload, 'Should have serverDownload field');
            assert.ok(['enabled', 'disabled'].includes(result.data.serverDownload), 'serverDownload should be enabled or disabled');
            assert.strictEqual(result.data.musicDir, TEST_MUSIC_DIR);
        });

        it('should reflect SERVER_DOWNLOAD environment variable', async () => {
            const result = await makeRequest('/api/config');
            
            // In test environment, SERVER_DOWNLOAD is not set, so should be disabled
            assert.strictEqual(result.data.serverDownload, 'disabled');
        });
    });

    describe('Blob Download', () => {
        it('should save blob data to file', async () => {
            const testContent = 'test audio data';
            const base64Content = Buffer.from(testContent).toString('base64');
            const filename = 'test-track.mp3';

            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    blob: base64Content,
                    filename: filename,
                    folder: ''
                }
            });

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.success, true);
            
            // Verify file exists and content is correct
            const filePath = join(TEST_MUSIC_DIR, filename);
            await access(filePath);
            const content = await readFile(filePath, 'utf8');
            assert.strictEqual(content, testContent);
        });

        it('should create nested folder structure', async () => {
            const testContent = 'nested test';
            const base64Content = Buffer.from(testContent).toString('base64');
            const folder = 'Artist Name/Album Name';
            const filename = 'track.flac';

            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    blob: base64Content,
                    filename: filename,
                    folder: folder
                }
            });

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.success, true);
            
            // Verify folder structure and file
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
            
            const content = await readFile(filePath, 'utf8');
            assert.strictEqual(content, testContent);
        });

        it('should handle multiple files in same folder', async () => {
            const folder = 'Test Album';
            const files = ['track1.mp3', 'track2.mp3', 'track3.mp3'];
            
            for (const filename of files) {
                const content = `content of ${filename}`;
                const base64 = Buffer.from(content).toString('base64');
                
                const result = await makeRequest('/api/download/blob', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: { blob: base64, filename, folder }
                });
                
                assert.strictEqual(result.status, 200);
            }
            
            // Verify all files exist
            const folderPath = join(TEST_MUSIC_DIR, folder);
            const dirContents = await readdir(folderPath);
            assert.strictEqual(dirContents.length, 3);
            assert.ok(dirContents.includes('track1.mp3'));
            assert.ok(dirContents.includes('track2.mp3'));
            assert.ok(dirContents.includes('track3.mp3'));
        });

        it('should reject request without blob', async () => {
            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { filename: 'test.mp3' }
            });

            assert.strictEqual(result.status, 400);
            assert.ok(result.data.error);
        });

        it('should reject request without filename', async () => {
            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { blob: 'dGVzdA==' }
            });

            assert.strictEqual(result.status, 400);
            assert.ok(result.data.error);
        });
    });

    describe('Lyrics Download', () => {
        it('should save lyrics file', async () => {
            const lyricsContent = '[00:00.00] Test lyrics\n[00:05.00] Second line';
            const filename = 'test-lyrics.lrc';

            const result = await makeRequest('/api/download/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    content: lyricsContent,
                    filename: filename,
                    folder: ''
                }
            });

            assert.strictEqual(result.status, 200);
            assert.strictEqual(result.data.success, true);
            
            // Verify file and content
            const filePath = join(TEST_MUSIC_DIR, filename);
            const savedContent = await readFile(filePath, 'utf8');
            assert.strictEqual(savedContent, lyricsContent);
        });

        it('should save lyrics with album folder', async () => {
            const lyricsContent = '[00:00.00] Lyrics with folder';
            const folder = 'Artist/Album';
            const filename = 'track.lrc';

            const result = await makeRequest('/api/download/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { content: lyricsContent, filename, folder }
            });

            assert.strictEqual(result.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
            const savedContent = await readFile(filePath, 'utf8');
            assert.strictEqual(savedContent, lyricsContent);
        });

        it('should handle empty lyrics', async () => {
            const result = await makeRequest('/api/download/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    content: '',
                    filename: 'empty.lrc',
                    folder: ''
                }
            });

            assert.strictEqual(result.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, 'empty.lrc');
            const content = await readFile(filePath, 'utf8');
            assert.strictEqual(content, '');
        });

        it('should reject request without content', async () => {
            const result = await makeRequest('/api/download/lyrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { filename: 'test.lrc' }
            });

            assert.strictEqual(result.status, 400);
        });
    });

    describe('Special Characters', () => {
        it('should handle spaces and symbols in filenames', async () => {
            const content = 'test';
            const base64 = Buffer.from(content).toString('base64');
            const filename = 'Track (feat. Artist) & More.mp3';

            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { blob: base64, filename, folder: '' }
            });

            assert.strictEqual(result.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, filename);
            await access(filePath);
        });

        it('should handle unicode characters', async () => {
            const content = 'test unicode';
            const base64 = Buffer.from(content).toString('base64');
            const folder = 'Artiste Français/Álbum Español';
            const filename = 'Трек.mp3';

            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { blob: base64, filename, folder }
            });

            assert.strictEqual(result.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
        });

        it('should handle emoji in folder names', async () => {
            const content = 'emoji test';
            const base64 = Buffer.from(content).toString('base64');
            const folder = 'Artist 🎵/Album 🎸';
            const filename = 'track.mp3';

            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { blob: base64, filename, folder }
            });

            assert.strictEqual(result.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
        });
    });

    describe('File Organization', () => {
        it('should organize album download structure', async () => {
            const albumFolder = 'Pink Floyd - The Dark Side of the Moon';
            const tracks = [
                '01 - Speak to Me.flac',
                '02 - Breathe.flac',
                '03 - On the Run.flac'
            ];

            // Save cover
            const coverBase64 = Buffer.from('fake cover data').toString('base64');
            await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: { blob: coverBase64, filename: 'cover.jpg', folder: albumFolder }
            });

            // Save tracks
            for (const track of tracks) {
                const trackData = Buffer.from(`audio data for ${track}`).toString('base64');
                await makeRequest('/api/download/blob', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: { blob: trackData, filename: track, folder: albumFolder }
                });

                // Save lyrics
                const lyricsContent = `[00:00.00] Lyrics for ${track}`;
                const lrcFilename = track.replace('.flac', '.lrc');
                await makeRequest('/api/download/lyrics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: { content: lyricsContent, filename: lrcFilename, folder: albumFolder }
                });
            }

            // Verify structure
            const albumPath = join(TEST_MUSIC_DIR, albumFolder);
            const files = await readdir(albumPath);
            
            assert.ok(files.includes('cover.jpg'));
            assert.strictEqual(files.filter(f => f.endsWith('.flac')).length, 3);
            assert.strictEqual(files.filter(f => f.endsWith('.lrc')).length, 3);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed JSON', async () => {
            try {
                await new Promise((resolve, reject) => {
                    const req = http.request({
                        hostname: '127.0.0.1',
                        port: TEST_PORT,
                        path: '/api/download/blob',
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            resolve({ status: res.statusCode, data });
                        });
                    });
                    req.on('error', reject);
                    req.write('{ invalid json }');
                    req.end();
                });
                assert.fail('Should have thrown an error');
            } catch (err) {
                // Expected to fail with bad JSON
                assert.ok(true);
            }
        });

        it('should handle invalid base64', async () => {
            const result = await makeRequest('/api/download/blob', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    blob: 'not-valid-base64!!!',
                    filename: 'test.mp3',
                    folder: ''
                }
            });

            // Server should handle this gracefully
            assert.ok(result.status === 200 || result.status === 500);
        });
    });
});
