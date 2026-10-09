import 'server-only'
import { MongoClient, type Db } from 'mongodb'

type MemoryServer = { stop: () => Promise<boolean> }

type Slot = {
  ready?: Promise<Db>
  client?: MongoClient
  memory?: MemoryServer
  baseUrl?: string
}

const globalForMongo = globalThis as typeof globalThis & { __seventyTwo?: Slot }

function slotOf(): Slot {
  if (!globalForMongo.__seventyTwo) globalForMongo.__seventyTwo = {}
  return globalForMongo.__seventyTwo
}

export function baseUrl(): string {
  const slot = slotOf()
  if (slot.baseUrl) return slot.baseUrl
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')
  return fromEnv || 'http://localhost:3000'
}

async function rememberRequestBase(): Promise<void> {
  try {
    const { headers } = await import('next/headers')
    const headerList = await headers()
    const host = headerList.get('x-forwarded-host') || headerList.get('host')
    if (!host) return
    const forwarded = headerList.get('x-forwarded-proto')
    const proto = forwarded || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
    slotOf().baseUrl = `${proto}://${host}`
  } catch {
    // Scheduler calls have no request headers.
  }
}

async function connect(slot: Slot): Promise<Db> {
  const configured = process.env.MONGODB_URI
  let url = configured
  if (!url) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Set MONGODB_URI to your MongoDB connection string.')
    }
    console.log('72 Hours: using embedded MongoDB')
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    const memory = await MongoMemoryServer.create()
    slot.memory = memory
    url = memory.getUri()
  } else {
    console.log('72 Hours: using MONGODB_URI')
  }
  const client = new MongoClient(url)
  await client.connect()
  slot.client = client
  return client.db('seventy_two')
}

export function getDb(): Promise<Db> {
  const slot = slotOf()
  if (!slot.ready) {
    const pending = (async () => {
      await rememberRequestBase()
      return connect(slot)
    })()
    slot.ready = pending
    pending.catch(async () => {
      if (slot.ready === pending) slot.ready = undefined
      await slot.memory?.stop().catch(() => undefined)
      slot.memory = undefined
      slot.client = undefined
    })
  } else {
    void rememberRequestBase()
  }
  return slot.ready
}
