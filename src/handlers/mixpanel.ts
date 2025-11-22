export function handleMixpanelRequest(request: Request) {
	const url = new URL(request.url)
	let targetUrl

	switch (true) {
		case url.pathname === '/__mix/lib.min.js':
			targetUrl = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
			break
		case url.pathname === '/__mix/lib.js':
			targetUrl = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.js'
			break
		case url.pathname.startsWith('/__mix/decide'):
			targetUrl = 'https://decide.mixpanel.com' + url.pathname.replace('/__mix/decide', '/')
			break
		default:
			targetUrl = 'https://api.mixpanel.com' + url.pathname.replace('/__mix/', '/')
			break
	}

	const modifiedRequest = new Request(targetUrl + url.search, {
		body: request.body,
		headers: request.headers,
		method: request.method,
		redirect: request.redirect
	})

	modifiedRequest.headers.set('X-Real-IP', request.headers.get('cf-connecting-ip'))
	modifiedRequest.headers.set('X-Forwarded-For', request.headers.get('cf-connecting-ip'))
	modifiedRequest.headers.set('X-Forwarded-Host', url.hostname)

	return fetch(modifiedRequest)
}
