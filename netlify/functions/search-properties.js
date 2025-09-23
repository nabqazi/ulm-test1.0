const { getProperties } = require('./data/properties');

// Helper function to validate and parse query parameters
function parseQueryParams(queryStringParameters) {
  const params = {};
  
  if (!queryStringParameters) {
    return params;
  }

  // Parse location (case-insensitive partial match)
  if (queryStringParameters.location) {
    params.location = queryStringParameters.location.trim().toLowerCase();
  }

  // Parse status (exact match, case-insensitive)
  if (queryStringParameters.status) {
    const validStatuses = ['available', 'sold out', 'coming soon'];
    const status = queryStringParameters.status.trim().toLowerCase();
    if (validStatuses.includes(status)) {
      params.status = status;
    }
  }

  // Parse minPrice (must be a positive number)
  if (queryStringParameters.minPrice) {
    const minPrice = parseFloat(queryStringParameters.minPrice);
    if (!isNaN(minPrice) && minPrice >= 0) {
      params.minPrice = minPrice;
    }
  }

  // Parse maxPrice (must be a positive number)
  if (queryStringParameters.maxPrice) {
    const maxPrice = parseFloat(queryStringParameters.maxPrice);
    if (!isNaN(maxPrice) && maxPrice >= 0) {
      params.maxPrice = maxPrice;
    }
  }

  // Validate price range
  if (params.minPrice !== undefined && params.maxPrice !== undefined) {
    if (params.minPrice > params.maxPrice) {
      throw new Error('minPrice cannot be greater than maxPrice');
    }
  }

  return params;
}

// Helper function to filter properties based on query parameters
function filterProperties(params) {
  const properties = getProperties();
  return properties.filter(property => {
    // Filter by location (partial match, case-insensitive)
    if (params.location && !property.location.toLowerCase().includes(params.location)) {
      return false;
    }

    // Filter by status (exact match, case-insensitive)
    if (params.status && property.status.toLowerCase() !== params.status) {
      return false;
    }

    // Filter by price range
    if (params.minPrice !== undefined && property.price < params.minPrice) {
      return false;
    }

    if (params.maxPrice !== undefined && property.price > params.maxPrice) {
      return false;
    }

    return true;
  });
}

// Main handler function
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

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
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      })
    };
  }

  try {
    // Parse and validate query parameters
    const params = parseQueryParams(event.queryStringParameters);
    
    // Filter properties based on parameters
    const filteredProperties = filterProperties(params);
    const allProperties = getProperties();

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        count: filteredProperties.length,
        total: allProperties.length,
        filters: params,
        properties: filteredProperties
      })
    };

  } catch (error) {
    // Handle validation errors
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Bad Request',
        message: error.message
      })
    };
  }
};
