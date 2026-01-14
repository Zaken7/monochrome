pipeline {
    agent {
        label 'agent1'
    }

    environment {
        // Change these to match your setup
        DOCKER_USER = 'zaken7'
        IMAGE_NAME  = 'monochrome'
        IMAGE_TAG   = "1.1.${env.BUILD_ID}" // Uses the Jenkins build number as the tag
    }

    stages {
        stage('Checkout Code') {
            steps {
                // Jenkins pulls the code automatically if configured via SCM
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the image using the Dockerfile in the root
                    dockerImage = docker.build(
                        "${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_TAG}",
                        "--build-arg APP_VERSION=${IMAGE_TAG} ."
                    )
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    // Use the ID we created in Step 2
                    docker.withRegistry('', 'dockerhub-creds-token') {
                        dockerImage.push()
                        dockerImage.push("latest") // Also tag and push as 'latest'
                    }
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                sh "docker rmi ${DOCKER_USER}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }
    }
}
