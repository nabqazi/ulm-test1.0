const { deleteProperty } = require('./data/properties');
const { 
  getSecurityHeaders, 
  checkRateLimit, 
  sanitizeError, 
  validatePropertyId 
} = require('./utils/security');

// Helper function to get client identifier for rate limiting
const getClientId = (event) => {
  return event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
};

exports.handler = async (event, context) => {
  const headers = getSecurityHeaders();

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
    // SECURITY FIX: Rate limiting
    const clientId = getClientId(event);
    checkRateLimit(clientId, 5, 60000); // 5 property deletions per minute

    // Extract property ID from path parameters with validation
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

    // SECURITY FIX: Validate property ID format
    validatePropertyId(propertyId);
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
    // SECURITY FIX: Sanitize error responses
    const safeError = sanitizeError(error);
    return {
      statusCode: error.message === 'Rate limit exceeded' ? 429 : 
                 error.message.includes('Invalid') ? 400 : 500,
      headers,
      body: JSON.stringify(safeError)
    };
  }
};
