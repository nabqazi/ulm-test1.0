const { getProperties } = require('./data/properties');
const { 
  getSecurityHeaders, 
  checkRateLimit, 
  sanitizeError, 
  sanitizeString,
  validateNumber
} = require('./utils/security');

// Helper function to get client identifier for rate limiting
const getClientId = (event) => {
  return event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
};

// Helper function to validate and parse query parameters
function parseQueryParams(queryStringParameters) {
  const params = {};
  
  if (!queryStringParameters) {
    return params;
  }

  // Parse location (case-insensitive partial match) with sanitization
  if (queryStringParameters.location) {
    params.location = sanitizeString(queryStringParameters.location.trim(), 100).toLowerCase();
  }

  // Parse status (exact match, case-insensitive)
  if (queryStringParameters.status) {
    const validStatuses = ['available', 'sold out', 'coming soon'];
    const status = sanitizeString(queryStringParameters.status.trim(), 20).toLowerCase();
    if (validStatuses.includes(status)) {
      params.status = status;
    }
  }

  // Parse minPrice (must be a positive number)
  if (queryStringParameters.minPrice) {
    const minPrice = validateNumber(queryStringParameters.minPrice, 0, 100000000);
    params.minPrice = minPrice;
  }

  // Parse maxPrice (must be a positive number)
  if (queryStringParameters.maxPrice) {
    const maxPrice = validateNumber(queryStringParameters.maxPrice, 0, 100000000);
    params.maxPrice = maxPrice;
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
    checkRateLimit(clientId, 100, 60000); // 100 search requests per minute

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
    // SECURITY FIX: Sanitize error responses
    const safeError = sanitizeError(error);
    return {
      statusCode: error.message === 'Rate limit exceeded' ? 429 : 
                 error.message.includes('minPrice') || error.message.includes('must be') ? 400 : 500,
      headers,
      body: JSON.stringify(safeError)
    };
  }
};
