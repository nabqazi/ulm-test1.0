const { updateProperty, validateProperty } = require('./data/properties');
const { 
  getSecurityHeaders, 
  checkRateLimit, 
  sanitizeError, 
  validatePropertyId,
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

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        message: 'Only PUT requests are supported'
      })
    };
  }

  try {
    // SECURITY FIX: Rate limiting
    const clientId = getClientId(event);
    checkRateLimit(clientId, 20, 60000); // 20 property updates per minute

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

    // SECURITY FIX: Safe JSON parsing with size limits
    let updateData;
    try {
      updateData = safeJsonParse(event.body);
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

    // Check if update data is empty
    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Update data cannot be empty'
        })
      };
    }

    // SECURITY FIX: Sanitize string inputs  
    if (updateData.title) {
      updateData.title = sanitizeString(updateData.title, 200);
    }
    if (updateData.description) {
      updateData.description = sanitizeString(updateData.description, 2000);
    }
    if (updateData.location) {
      updateData.location = sanitizeString(updateData.location, 100);
    }

    // Validate update data
    const validationErrors = validateProperty(updateData, true);
    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Validation Error',
          message: 'Invalid update data',
          details: validationErrors
        })
      };
    }

    // Update the property
    const updatedProperty = updateProperty(propertyId, updateData);

    if (!updatedProperty) {
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

    // Return the updated property
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Property updated successfully',
        property: updatedProperty
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
