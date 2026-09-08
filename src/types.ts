export type Firmware = {
  model: string
  family: string
  category: string
  version: string
  releasedAt: string
  downloadUrl: string
  releaseNotes: string
  releaseNotesUrl?: string
  sha256?: string
  critical?: boolean
  createdAt: string
  updatedAt: string
}

export type Catalog = {
  schemaVersion: '1.0'
  generatedAt: string
  products: Firmware[]
}

export type DeviceRow = { model: string; currentVersion: string; name?: string }
