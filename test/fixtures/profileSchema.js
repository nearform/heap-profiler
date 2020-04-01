const Ajv = require('ajv')

const profileNode = {
  $id: 'node',
  type: 'object',
  properties: {
    callFrame: {
      type: 'object',
      properties: {
        functionName: { type: 'string' },
        scriptId: { type: 'string' },
        url: { type: 'string' },
        lineNumber: { type: 'number' },
        columnNumber: { type: 'number' }
      },
      required: ['functionName', 'scriptId', 'url', 'lineNumber', 'columnNumber'],
      additionalProperties: false
    },
    selfSize: { type: 'number' },
    id: { type: 'number' },
    children: { type: 'array', items: { $ref: 'node' } }
  },
  required: ['callFrame', 'selfSize', 'id', 'children'],
  additionalProperties: false
}

const profileSample = {
  $id: 'sample',
  type: 'array',
  items: {
    type: 'object',
    properties: {
      size: { type: 'number' },
      nodeId: { type: 'number' },
      ordinal: { type: 'number' }
    },
    required: ['size', 'nodeId', 'ordinal'],
    additionalProperties: false
  }
}

const profile = {
  $id: 'profile',
  type: 'object',
  properties: {
    head: { $ref: 'node' },
    samples: { $ref: 'sample' }
  },
  required: ['head', 'samples'],
  additionalProperties: false
}

const ajv = new Ajv({ schemas: [profileNode, profileSample, profile] })
module.exports = ajv.getSchema('profile')
