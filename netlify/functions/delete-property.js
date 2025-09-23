const { deleteProperty } = require('./data/properties');

// Helper function to get CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only DELETE requests are supported'
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

    // Delete the property
    const deletedProperty = deleteProperty(propertyId);

    if (!deletedProperty) {
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

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Property deleted successfully',
        deletedProperty
      })
    };

  } catch (error) {
    console.error('Error in delete-property:', error);
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
