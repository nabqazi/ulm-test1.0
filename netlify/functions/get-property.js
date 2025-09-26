const { findPropertyById } = require('./data/properties');
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
    // SECURITY FIX: Rate limiting
    const clientId = getClientId(event);
    checkRateLimit(clientId, 50, 60000); // 50 requests per minute

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
