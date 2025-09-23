const { updateProperty, validateProperty } = require('./data/properties');

// Helper function to get CORS headers
const getCorsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

    // Parse request body
    let updateData;
    try {
      updateData = JSON.parse(event.body || '{}');
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
    console.error('Error in update-property:', error);
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
