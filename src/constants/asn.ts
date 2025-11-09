/**
 * Known ASNs (Autonomous System Numbers) for datacenter/hosting providers
 *
 * These are networks that typically host servers, not residential users.
 * Detection is instant using request.cf.asn from Cloudflare.
 *
 * Sources:
 * - https://ipinfo.io/AS{number}
 * - https://bgp.he.net/
 * - Cloud provider documentation
 */

export const DATACENTER_ASNS = new Set([
	// Amazon Web Services (AWS)
	16509, // Amazon-02
	14618, // Amazon-AES
	8987,  // Amazon-01

	// Google Cloud Platform (GCP)
	15169, // Google LLC
	36040, // Google Cloud
	396982, // Google Cloud

	// Microsoft Azure
	8075,  // Microsoft Corporation
	12076, // Microsoft Azure

	// DigitalOcean
	14061, // DigitalOcean LLC

	// Linode
	63949, // Linode

	// Vultr
	20473, // AS-CHOOPA (Vultr)

	// Hetzner
	24940, // Hetzner Online GmbH

	// OVH
	16276, // OVH SAS

	// Cloudflare (Workers, Pages)
	13335, // Cloudflare Inc

	// Oracle Cloud
	31898, // Oracle Corporation

	// IBM Cloud
	36351, // IBM Cloud

	// Alibaba Cloud
	45102, // Alibaba (US) Technology Co., Ltd.
	37963, // Alibaba (China) Technology Co., Ltd.

	// Tencent Cloud
	132203, // Tencent Building, Kejizhongyi Avenue
	45090,  // Tencent Cloud Computing

	// Scaleway
	12876, // Online S.A.S. (Scaleway)

	// Contabo
	51167, // Contabo GmbH

	// Kamatera
	58065, // Kamatera Inc

	// Atlantic.Net
	14999, // Atlantic.Net Inc

	// DreamHost
	26347, // DreamHost

	// HostGator
	27257, // Unified Layer (HostGator)

	// GoDaddy
	26496, // GoDaddy.com LLC

	// Rackspace
	27357, // Rackspace Hosting

	// Aruba Cloud
	31034, // Aruba S.p.A.

	// Liquid Web
	32244, // Liquid Web L.L.C

	// A2 Hosting
	55293, // A2 Hosting

	// InMotion Hosting
	22611, // InMotion Hosting

	// SiteGround
	60781, // SiteGround Hosting Ltd

	// Namecheap
	22612, // Namecheap Inc

	// PythonAnywhere
	41495  // FreeBit Co Ltd (PythonAnywhere)
])

/**
 * Check if an ASN belongs to a datacenter/hosting provider
 */
export function isDatacenterASN(asn: number | undefined): boolean {
	if (!asn || typeof asn !== 'number') return false
	return DATACENTER_ASNS.has(asn)
}

/**
 * Get the network name for an ASN (for logging/debugging)
 */
export function getASNName(asn: number): string {
	const names: Record<number, string> = {
		16509: 'AWS',
		14618: 'AWS',
		8987: 'AWS',
		15169: 'Google Cloud',
		36040: 'Google Cloud',
		396982: 'Google Cloud',
		8075: 'Microsoft Azure',
		12076: 'Microsoft Azure',
		14061: 'DigitalOcean',
		63949: 'Linode',
		20473: 'Vultr',
		24940: 'Hetzner',
		16276: 'OVH',
		13335: 'Cloudflare',
		31898: 'Oracle Cloud',
		36351: 'IBM Cloud',
		45102: 'Alibaba Cloud',
		37963: 'Alibaba Cloud',
		132203: 'Tencent Cloud',
		45090: 'Tencent Cloud',
		12876: 'Scaleway',
		51167: 'Contabo'
	}

	return names[asn] || `ASN ${asn}`
}
