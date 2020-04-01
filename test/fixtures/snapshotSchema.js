const Ajv = require('ajv')

const snapshot = {
  $id: 'snapshot',
  type: 'object',
  properties: {
    snapshot: {
      type: 'object',
      properties: {
        meta: {
          type: 'object',
          properties: {
            node_fields: {
              type: 'array',
              items: { type: 'string' }
            },
            node_types: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'array',
                    items: { type: 'string' }
                  }
                ]
              }
            },
            edge_fields: {
              type: 'array',
              items: { type: 'string' }
            },
            edge_types: {
              type: 'array',
              items: {
                oneOf: [
                  { type: 'string' },
                  {
                    type: 'array',
                    items: { type: 'string' }
                  }
                ]
              }
            },
            trace_function_info_fields: {
              type: 'array',
              items: { type: 'string' }
            },
            trace_node_fields: {
              type: 'array',
              items: { type: 'string' }
            },
            sample_fields: {
              type: 'array',
              items: { type: 'string' }
            },
            location_fields: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: [
            'node_fields',
            'node_types',
            'edge_fields',
            'edge_types',
            'trace_function_info_fields',
            'trace_node_fields',
            'sample_fields',
            'location_fields'
          ],
          additionalProperties: false
        },
        node_count: { type: 'number' },
        edge_count: { type: 'number' },
        trace_function_count: { type: 'number' }
      },
      required: ['meta', 'node_count', 'edge_count', 'trace_function_count'],
      additionalProperties: false
    },
    nodes: {
      type: 'array',
      items: { type: 'number' }
    },
    edges: {
      type: 'array',
      items: { type: 'number' }
    },
    locations: {
      type: 'array',
      items: { type: 'number' }
    },
    trace_function_infos: {
      type: 'array',
      items: { type: 'number' }
    },
    trace_tree: {
      type: 'array',
      items: { type: 'number' }
    },
    samples: {
      type: 'array',
      items: { type: 'number' }
    },
    strings: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['snapshot', 'nodes', 'edges', 'locations', 'trace_function_infos', 'trace_tree', 'samples', 'strings'],
  additionalProperties: false
}

const ajv = new Ajv({ schemas: [snapshot] })
module.exports = ajv.getSchema('snapshot')
