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
	// Microsoft Azure
	8075,  // Microsoft Corporation
	8987,  // Amazon-01
	12076, // Microsoft Azure

	// Scaleway
	12876, // Online S.A.S. (Scaleway)
	// Cloudflare (Workers, Pages)
	13335, // Cloudflare Inc
	// DigitalOcean
	14061, // DigitalOcean LLC

	14618, // Amazon-AES
	// Atlantic.Net
	14999, // Atlantic.Net Inc

	// Google Cloud Platform (GCP)
	15169, // Google LLC

	// OVH
	16276, // OVH SAS

	// Amazon Web Services (AWS)
	16509, // Amazon-02

	// Vultr
	20473, // AS-CHOOPA (Vultr)

	// InMotion Hosting
	22611, // InMotion Hosting

	// Namecheap
	22612, // Namecheap Inc

	// Hetzner
	24940, // Hetzner Online GmbH

	// DreamHost
	26347, // DreamHost

	// GoDaddy
	26496, // GoDaddy.com LLC
	// HostGator
	27257, // Unified Layer (HostGator)

	// Rackspace
	27357, // Rackspace Hosting
	// Aruba Cloud
	31034, // Aruba S.p.A.

	// Oracle Cloud
	31898, // Oracle Corporation

	// Liquid Web
	32244, // Liquid Web L.L.C

	36040, // Google Cloud

	// IBM Cloud
	36351, // IBM Cloud

	37963, // Alibaba (China) Technology Co., Ltd.

	// PythonAnywhere
	41495,  // FreeBit Co Ltd (PythonAnywhere)

	45090,  // Tencent Cloud Computing

	// Alibaba Cloud
	45102, // Alibaba (US) Technology Co., Ltd.

	// Contabo
	51167, // Contabo GmbH

	// A2 Hosting
	55293, // A2 Hosting

	// Kamatera
	58065, // Kamatera Inc

	// SiteGround
	60781, // SiteGround Hosting Ltd

	// Linode
	63949, // Linode

	// Tencent Cloud
	132203, // Tencent Building, Kejizhongyi Avenue

	396982 // Google Cloud
])

/**
 * Get the network name for an ASN (for logging/debugging)
 */
export function getASNName(asn: number): string {
	const names: Record<number, string> = {
		8075: 'Microsoft Azure',
		8987: 'AWS',
		12076: 'Microsoft Azure',
		12876: 'Scaleway',
		13335: 'Cloudflare',
		14061: 'DigitalOcean',
		14618: 'AWS',
		15169: 'Google Cloud',
		16276: 'OVH',
		16509: 'AWS',
		20473: 'Vultr',
		24940: 'Hetzner',
		31898: 'Oracle Cloud',
		36040: 'Google Cloud',
		36351: 'IBM Cloud',
		37963: 'Alibaba Cloud',
		45090: 'Tencent Cloud',
		45102: 'Alibaba Cloud',
		51167: 'Contabo',
		63949: 'Linode',
		132203: 'Tencent Cloud',
		396982: 'Google Cloud'
	}

	return names[asn] || `ASN ${asn}`
}

/**
 * Check if an ASN belongs to a datacenter/hosting provider
 */
export function isDatacenterASN(asn: number | undefined): boolean {
	if (!asn || typeof asn !== 'number') return false
	return DATACENTER_ASNS.has(asn)
}
