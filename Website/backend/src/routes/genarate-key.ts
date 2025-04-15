import express from 'express';
import { google } from 'googleapis';
import mongoose from 'mongoose';
import User from '../models/User';
const router = express.Router();

const projectId = process.env.GCP_PROJECT_ID;

async function createApiKey() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  
    try {
      const authClient = await auth.getClient();
      console.log('Authentication client created successfully');
  
      // @ts-ignore
      const apiKeysClient = google.apikeys({ version: 'v2', auth: authClient });
      console.log('API Keys client initialized');
  
      const parent = `projects/${projectId}/locations/global`;
  
      const operation = await apiKeysClient.projects.locations.keys.create({
        parent,
        requestBody: {
          displayName: 'VertexAI-Frontend-Key',
          restrictions: {
            apiTargets: [
              {
                service: 'aiplatform.googleapis.com',
              },
            ],
          },
        },
      });
  
      // Wait for long-running operation to complete
      // @ts-ignore
      const { data: keyData } = await google.apikeys('v2').operations.get({
        // @ts-ignore
        name: operation.data.name,
        auth: authClient
      });
  
      console.log('API key created successfully');
      console.log('Operation details:', JSON.stringify(keyData, null, 2));
  
      return keyData.response.keyString;
    } catch (err: any) {
      console.error('Authentication failed:', {
        message: err.message,
        code: err.code,
        details: err.response?.data,
        stack: err.stack
      });
      process.exit(1);
    }
  }
  

// Generate api key
router.get('/', async (req, res) => {
    try {
      const apiKey = await createApiKey();
      res.json({ 
        apiKey,
        status: 'success',
        message: 'API key generated successfully'
      });
    } catch (err : any) {
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data
      });
      console.error('Error generating API key:', err);
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate API key',
        error: err.message
      });
    }
  });
// Generate api key
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const apiKey = await createApiKey();
    
    // Add the new API key to user's apiKeys array
    user.apiKeys.push({
      key: apiKey,
      createdAt: new Date(),
      isActive: true,
      serviceAccountEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL || '',
      projectId: projectId || '',
      service: 'aiplatform.googleapis.com'
    });

    await user.save({ validateBeforeSave: false });

    res.json({ 
      apiKey,
      status: 'success',
      message: 'API key generated and stored successfully'
    });
  } catch (err : any) {
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      response: err.response?.data
    });
    console.error('Error generating API key:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate API key',
      error: err.message
    });
  }
});
export default router;