const { createProperty, validateProperty } = require('./data/properties');
const { 
  getSecurityHeaders, 
  checkRateLimit, 
  sanitizeError, 
  safeJsonParse,
  sanitizeString
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
    // SECURITY FIX: Rate limiting  
    const clientId = getClientId(event);
    checkRateLimit(clientId, 10, 60000); // 10 property creation requests per minute

    // SECURITY FIX: Safe JSON parsing with size limits
    let propertyData;
    try {
      propertyData = safeJsonParse(event.body);
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

    // SECURITY FIX: Sanitize string inputs
    if (propertyData.title) {
      propertyData.title = sanitizeString(propertyData.title, 200);
    }
    if (propertyData.description) {
      propertyData.description = sanitizeString(propertyData.description, 2000);
    }
    if (propertyData.location) {
      propertyData.location = sanitizeString(propertyData.location, 100);
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
    // SECURITY FIX: Sanitize error responses
    const safeError = sanitizeError(error);
    return {
      statusCode: error.message === 'Rate limit exceeded' ? 429 : 
                 error.message.includes('Invalid') || error.message.includes('exceeds') ? 400 : 500,
      headers,
      body: JSON.stringify(safeError)
    };
  }
};
