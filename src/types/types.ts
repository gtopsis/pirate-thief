export type Job = [
    company: string,
    title: string,
    location: string,
    techArea: string,
    url: string,
  ]

  export interface SpreadSheetResponse {
    majorDimension: string
    range: string
    values: string[][]
  } 