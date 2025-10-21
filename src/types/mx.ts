export type Answer = {
	data: string
	name: string
	TTL: number
	type: number
}

export type MXResponse = {
	AD: boolean
	Answer: Answer[]
	CD: boolean
	Question: Question[]
	RA: boolean
	RD: boolean
	Status: number
	TC: boolean
}

export type Question = {
	name: string
	type: number
}
