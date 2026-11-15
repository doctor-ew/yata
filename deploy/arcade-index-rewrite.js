var SPA_ROOTS = [
    '/atcn/atlas/session-01',
];

function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Arcade game packages include extensionless companion files and licenses.
    if (uri === '/arcade') return {statusCode: 301, statusDescription: 'Moved Permanently', headers: {location: {value: '/arcade/'}}};
    if (uri.startsWith('/arcade/assets/')) return request;

    // Assets have a file extension — pass through untouched
    var hasExtension = uri.includes('.', uri.lastIndexOf('/') + 1);
    if (hasExtension) return request;

    // Check if this path lives under a known SPA root
    for (var i = 0; i < SPA_ROOTS.length; i++) {
        var root = SPA_ROOTS[i];
        if (uri === root || uri === root + '/' || uri.startsWith(root + '/')) {
            // All routes under this SPA → serve its index.html
            request.uri = root + '/index.html';
            return request;
        }
    }

    // Generic directory fallback: trailing slash → index.html
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    } else {
        request.uri = uri + '/index.html';
    }

    return request;
}
