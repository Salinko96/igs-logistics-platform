/**
 * Test Fixtures & Utilities for E2E Tests
 * Provides standard binary file generators, MIME helpers, and mock session contexts.
 */

import { NextRequest } from 'next/server'

export interface TestUserSession {
  user: { id: string; email: string }
  profile: {
    id: string
    userId: string
    organizationId: string
    role: 'ADMIN' | 'AGENT' | 'CLIENT'
    clientId: string | null
  }
}

export const ADMIN_SESSION: TestUserSession = {
  user: { id: 'user-admin-01', email: 'admin@iss-logistics.com' },
  profile: {
    id: 'profile-admin-01',
    userId: 'user-admin-01',
    organizationId: 'org-test-01',
    role: 'ADMIN',
    clientId: null,
  },
}

export const AGENT_SESSION: TestUserSession = {
  user: { id: 'user-agent-01', email: 'agent@iss-logistics.com' },
  profile: {
    id: 'profile-agent-01',
    userId: 'user-agent-01',
    organizationId: 'org-test-01',
    role: 'AGENT',
    clientId: null,
  },
}

export const CLIENT_SESSION: TestUserSession = {
  user: { id: 'user-client-01', email: 'client@company.com' },
  profile: {
    id: 'profile-client-01',
    userId: 'user-client-01',
    organizationId: 'org-test-01',
    role: 'CLIENT',
    clientId: 'client-99',
  },
}

export const OTHER_CLIENT_SESSION: TestUserSession = {
  user: { id: 'user-client-02', email: 'otherclient@company.com' },
  profile: {
    id: 'profile-client-02',
    userId: 'user-client-02',
    organizationId: 'org-test-01',
    role: 'CLIENT',
    clientId: 'client-88',
  },
}

/**
 * Generates sample binary Buffer for different file types.
 */
export function createMockFileBuffer(type: 'pdf' | 'png' | 'jpg' | 'exe' | 'empty' | 'oversized' | 'corrupted_pdf'): Buffer {
  switch (type) {
    case 'pdf':
      return Buffer.from('%PDF-1.5\n%---- PDF HEADER ----\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF')
    case 'png':
      return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
    case 'jpg':
      return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])
    case 'exe':
      return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff])
    case 'empty':
      return Buffer.alloc(0)
    case 'oversized':
      // 10.5 MB Buffer
      return Buffer.alloc(10.5 * 1024 * 1024, 0x41)
    case 'corrupted_pdf':
      // Executable bytes disguised as PDF filename
      return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x21, 0x21, 0x21])
  }
}

/**
 * Creates a browser File object for UI component testing.
 */
export function createMockFile(
  filename: string,
  mimeType: string,
  bufferType: 'pdf' | 'png' | 'jpg' | 'exe' | 'empty' | 'oversized' | 'corrupted_pdf'
): File {
  const buf = createMockFileBuffer(bufferType)
  const file = new File([buf], filename, { type: mimeType })
  return file
}

/**
 * Constructs a mock NextRequest object with optional FormData.
 */
export function createMockNextRequest(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  formData?: FormData
): NextRequest {
  const requestInit: RequestInit = {
    method,
    headers: new Headers(),
  }

  if (formData) {
    requestInit.body = formData
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), requestInit)
}
