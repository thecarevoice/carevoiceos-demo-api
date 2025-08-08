const Joi = require('joi');

/**
 * Validate request body using Joi schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message),
      });
    }
    
    next();
  };
};

/**
 * Validate request query parameters using Joi schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors: error.details.map(detail => detail.message),
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  
  authenticate: Joi.object({
    uniqueId: Joi.string().required(),
  }),
};

module.exports = {
  validateBody,
  validateQuery,
  schemas,
}; 