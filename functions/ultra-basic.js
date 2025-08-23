// Very basic function for Netlify - no ES6+ syntax
function handler(event, context, callback) {
    callback(null, {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Ultra basic function is working!',
            method: event.httpMethod || 'unknown',
            path: event.path || 'unknown'
        })
    });
}

exports.handler = handler;
