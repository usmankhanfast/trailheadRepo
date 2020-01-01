#!/usr/bin/env groovy

pipeline {
    agent any
    environment {
        DEV_SANDBOX_CREDS = credentials('dev_sandbox');
    }

    stages {
        stage('Checkout'){
            steps{
                echo 'Checking out code'
                checkout scm
                echo 'On branch: ' + env.BRANCH_NAME
            }
        }
        stage('Build') {
            steps {
                echo 'Building...'
                sh "yarn install"
                sh "grunt development"
                sh "/bin/bash resource-bundle-compiler.sh"
            }
        }
        stage('Deploy') {
            steps {
                echo 'Deploying...'
                lock('claritydev'){
                    withAnt(installation:'Ant'){
                        sh "ant deployCustom -Du=$DEV_SANDBOX_CREDS_USR -Dp=$DEV_SANDBOX_CREDS_PSW -Durl='https://test.salesforce.com'"
                        sh "ant deployLayoutsJenkins -Du=$DEV_SANDBOX_CREDS_USR -Dp=$DEV_SANDBOX_CREDS_PSW -Durl='https://test.salesforce.com'"
                        sh "ant unDeployJenkins -Du=$DEV_SANDBOX_CREDS_USR -Dp=$DEV_SANDBOX_CREDS_PSW -Durl='https://test.salesforce.com'"
                    }
                }
            }
        }
    }
}