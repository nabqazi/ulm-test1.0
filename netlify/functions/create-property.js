const { createProperty, validateProperty } = require('./data/properties');

// Helper function to get CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

exports.handler = async (event, context) => {
  const headers = getCorsHeaders();

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      })
    };
  }

  try {
    // Parse request body
    let propertyData;
    try {
      propertyData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Invalid JSON in request body'
        })
      };
    }

    // Validate property data
    const validationErrors = validateProperty(propertyData, false);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Validation Error',
          message: 'Invalid property data',
          details: validationErrors
        })
      };
    }

    // Create the property
    const newProperty = createProperty(propertyData);

    // Return the created property
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Property created successfully',
        property: newProperty
      })
    };

  } catch (error) {
    console.error('Error in create-property:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      })
    };
  }
};
