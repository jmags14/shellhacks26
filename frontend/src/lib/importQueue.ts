import { useSyncExternalStore } from 'react'
import { api } from './api'

// Tracks recipe imports that run in the background on the backend.
// startImport() returns immediately; we poll the backend until the job finishes.
// Running jobs are remembered in localStorage so polling resumes if the app is reopened.

export interface ImportJob {
  id: string
  url: string
  status: 'running' | 'done' | 'error'
  error?: string
  startedAt: number
}

const STORAGE_KEY = 'import-jobs'
const POLL_MS = 3000
const GIVE_UP_MS = 5 * 60 * 1000

function loadRunning(): ImportJob[] {
  try {
    const saved: ImportJob[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return saved.filter(j => j.status === 'running')
  } catch {
    return []
  }
}

let jobs: ImportJob[] = loadRunning()
const listeners = new Set<() => void>()
const submitting = new Set<string>() // urls being sent right now (guards double-invocation)

function emit() {
  jobs = [...jobs]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.filter(j => j.status === 'running')))
  } catch {
    // storage unavailable: the queue still works for this session
  }
  listeners.forEach(l => l())
}

function update(id: string, patch: Partial<ImportJob>) {
  jobs = jobs.map(j => (j.id === id ? { ...j, ...patch } : j))
  emit()
}

function poll(job: ImportJob) {
  const timer = setInterval(async () => {
    if (Date.now() - job.startedAt > GIVE_UP_MS) {
      clearInterval(timer)
      update(job.id, { status: 'error', error: 'Import timed out.' })
      return
    }
    try {
      const res = await api.importStatus(job.id)
      if (res.status === 'running') return
      clearInterval(timer)
      if (res.status === 'done') update(job.id, { status: 'done' })
      else update(job.id, { status: 'error', error: res.error ?? 'Import failed.' })
    } catch {
      // transient network error: keep polling
    }
  }, POLL_MS)
}

export async function startImport(url: string, userId: string) {
  if (submitting.has(url) || jobs.some(j => j.url === url && j.status === 'running')) return
  submitting.add(url)
  try {
    const res = await api.startImport(url, userId)
    const job: ImportJob = { id: res.job_id, url, status: 'running', startedAt: Date.now() }
    jobs = [...jobs, job]
    emit()
    poll(job)
  } catch {
    jobs = [
      ...jobs,
      { id: crypto.randomUUID(), url, status: 'error', error: 'Could not reach the server.', startedAt: Date.now() },
    ]
    emit()
  } finally {
    submitting.delete(url)
  }
}

export function dismissImport(id: string) {
  jobs = jobs.filter(j => j.id !== id)
  emit()
}

// Resume polling for jobs left over from a previous session.
jobs.forEach(poll)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useImportJobs() {
  return useSyncExternalStore(subscribe, () => jobs)
}
