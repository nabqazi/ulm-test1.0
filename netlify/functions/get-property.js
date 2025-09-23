const { findPropertyById } = require('./data/properties');

// Helper function to get CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      })
    };
  }

  try {
    // Extract property ID from path parameters
    const pathSegments = event.path.split('/');
    const propertyId = pathSegments[pathSegments.length - 1];

    if (!propertyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Property ID is required'
        })
      };
    }

    // Find the property
    const property = findPropertyById(propertyId);

    if (!property) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Not Found',
          message: `Property with ID ${propertyId} not found`
        })
      };
    }

    // Return the property
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        property
      })
    };

  } catch (error) {
    console.error('Error in get-property:', error);
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
