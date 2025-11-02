/**
 * Send email via Resend API
 */
export async function sendEmail({
	to,
	subject,
	html,
	from = 'noreply@vouch.expert'
}: {
	to: string
	subject: string
	html: string
	from?: string
}) {
	const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
	if (!RESEND_API_KEY) {
		throw new Error('RESEND_API_KEY not configured')
	}

	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${RESEND_API_KEY}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from,
			to,
			subject,
			html
		})
	})

	if (!response.ok) {
		const errorText = await response.text()
		console.error('Failed to send email:', errorText)
		throw new Error(`Failed to send email: ${errorText}`)
	}

	return response.json()
}

/**
 * Generate team invite email HTML
 */
export function generateInviteEmail({
	inviterEmail,
	projectName,
	role,
	inviteLink
}: {
	inviterEmail: string
	projectName: string
	role: string
	inviteLink: string
}) {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2 style="color: #000; margin-bottom: 20px;">You're invited to join ${projectName}!</h2>
			<p style="margin-bottom: 20px;">${inviterEmail} invited you to join <strong>${projectName}</strong> as a <strong>${role}</strong>.</p>
			<p style="margin-bottom: 30px;">
				<a href="${inviteLink}"
				   style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
					Accept Invite
				</a>
			</p>
			<p style="color: #666; font-size: 14px; margin-top: 30px;">
				If you weren't expecting this invitation, you can safely ignore this email.
			</p>
		</body>
		</html>
	`
}
