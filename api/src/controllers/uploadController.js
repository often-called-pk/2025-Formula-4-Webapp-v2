const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { parseTelemetryData, extractFastestLap } = require('../models/analysisModel');
const axios = require('axios');
const FormData = require('form-data');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const DATA_PROCESSING_URL = process.env.DATA_PROCESSING_URL || 'http://localhost:8000';

// Upload and process telemetry files
const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const user = req.user;
  const analysisId = uuidv4();
  let results = [];

  for (const file of req.files) {
    const filePath = file.path;
    const originalName = file.originalname;

    try {
      // 1. Upload raw file to Supabase Storage
      const fileContent = fs.readFileSync(filePath);
      const storagePath = `${user.id}/sessions/${analysisId}/${originalName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('telemetry-files')
        .upload(storagePath, fileContent, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Supabase Storage Error: ${uploadError.message}`);
      }

      // 2. Create a preliminary session record in the database
      const { metadata } = await parseTelemetryData(filePath); // Still needed for session name, etc.
      
      const sessionData = {
        id: uuidv4(),
        user_id: user.id,
        analysis_id: analysisId,
        session_name: metadata['Session'] || originalName,
        track_name: metadata['Track'] || 'Unknown Track',
        car_model: metadata['Vehicle'] || 'Unknown Car',
        session_date: metadata['Date'] ? new Date(metadata['Date']).toISOString() : new Date().toISOString(),
        file_url: storagePath,
        metadata: metadata,
      };

      const { data: dbData, error: dbError } = await supabase
        .from('telemetry_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (dbError) {
        throw new Error(`Database Error: ${dbError.message}`);
      }
      
      // 3. Asynchronously trigger the Python data processing service
      // We do this without awaiting the response to make the upload feel faster.
      // The Python service will update the DB record with analysis results.
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('session_id', dbData.id);
      
      axios.post(`${DATA_PROCESSING_URL}/telemetry/process`, formData, {
        headers: formData.getHeaders(),
      }).catch(err => {
        // Log the error, but don't fail the upload request
        console.error(`Failed to trigger processing for session ${dbData.id}:`, err.message);
      });

      results.push({
        sessionId: dbData.id,
        fileName: originalName,
        message: "Upload successful, processing has started."
      });

    } catch (error) {
      console.error(`Error processing file ${originalName}:`, error);
      // Clean up the failed file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(500).json({
        error: `Failed to process file: ${originalName}`,
        details: error.message,
      });
    } finally {
        // Final cleanup of the uploaded temp file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
  }

  res.status(202).json({
    success: true,
    analysisId: analysisId,
    results: results,
    message: 'All files accepted and are being processed.',
  });
};

// Get analysis data
const getAnalysis = async (req, res) => {
  try {
    const { analysisId } = req.params;

    const { data: sessions, error: sessionError } = await supabase
      .from('telemetry_sessions')
      .select('*')
      .eq('analysis_id', analysisId);

    if (sessionError) {
      throw sessionError;
    }

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: 'Analysis not found or no sessions processed yet.' });
    }

    // For now, we just return the session data.
    // A more advanced implementation might join telemetry_data here.
    res.json({
      success: true,
      analysisId: analysisId,
      sessions: sessions
    });

  } catch (error) {
    console.error('Analysis fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis data.', details: error.message });
  }
};

// Health check
const healthCheck = (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
};

module.exports = {
  uploadFiles,
  getAnalysis,
  healthCheck
}; 