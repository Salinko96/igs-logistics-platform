/**
 * Mock Prisma DB Implementation for E2E Tests
 * Provides in-memory persistence and query engine matching Prisma Client contracts for:
 * - Document model
 * - Organization model
 * - Case model
 * - Profile & User models
 */

export interface MockDocument {
  id: string
  caseId: string | null
  organizationId: string
  name: string
  category: string
  fileType: string | null
  fileSize: number | null
  fileUrl: string | null
  status: string
  version: number
  expiresAt: Date | null
  uploadedById: string | null
  sharedWithClient: boolean
  downloadToken: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  case?: { id: string; reference: string; clientId?: string | null; organizationId?: string } | null
}

export interface MockOrganization {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MockCase {
  id: string
  reference: string
  organizationId: string
  clientId: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface MockProfile {
  id: string
  userId: string
  organizationId: string
  role: 'ADMIN' | 'AGENT' | 'CLIENT'
  clientId: string | null
}

let idCounter = 1000
function generateId(prefix: string): string {
  idCounter++
  return `${prefix}_${Date.now()}_${idCounter}`
}

class MockPrismaDatabase {
  public documents: Map<string, MockDocument> = new Map()
  public organizations: Map<string, MockOrganization> = new Map()
  public cases: Map<string, MockCase> = new Map()
  public profiles: Map<string, MockProfile> = new Map()

  constructor() {
    this.seedDefaults()
  }

  public reset(): void {
    this.documents.clear()
    this.organizations.clear()
    this.cases.clear()
    this.profiles.clear()
    this.seedDefaults()
  }

  public seedDefaults(): void {
    const defaultOrg: MockOrganization = {
      id: 'org-test-01',
      name: 'ISS Logistics Guinea',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.organizations.set(defaultOrg.id, defaultOrg)

    const defaultAdmin: MockProfile = {
      id: 'profile-admin-01',
      userId: 'user-admin-01',
      organizationId: defaultOrg.id,
      role: 'ADMIN',
      clientId: null,
    }
    this.profiles.set(defaultAdmin.id, defaultAdmin)

    const defaultAgent: MockProfile = {
      id: 'profile-agent-01',
      userId: 'user-agent-01',
      organizationId: defaultOrg.id,
      role: 'AGENT',
      clientId: null,
    }
    this.profiles.set(defaultAgent.id, defaultAgent)

    const defaultClient: MockProfile = {
      id: 'profile-client-01',
      userId: 'user-client-01',
      organizationId: defaultOrg.id,
      role: 'CLIENT',
      clientId: 'client-99',
    }
    this.profiles.set(defaultClient.id, defaultClient)

    const defaultCase1: MockCase = {
      id: 'case-101',
      reference: 'DOS-2026-001',
      organizationId: defaultOrg.id,
      clientId: 'client-99',
      status: 'en_cours',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.cases.set(defaultCase1.id, defaultCase1)

    const defaultCase2: MockCase = {
      id: 'case-102',
      reference: 'DOS-2026-002',
      organizationId: defaultOrg.id,
      clientId: 'client-88',
      status: 'en_cours',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.cases.set(defaultCase2.id, defaultCase2)
  }

  // --- Document CRUD ---

  public document = {
    create: async (args: { data: Partial<MockDocument>; include?: Record<string, boolean> }): Promise<MockDocument> => {
      const id = args.data.id || generateId('doc')
      const caseRecord = args.data.caseId ? this.cases.get(args.data.caseId) || null : null

      const doc: MockDocument = {
        id,
        caseId: args.data.caseId || null,
        organizationId: args.data.organizationId || 'org-test-01',
        name: args.data.name || 'Untitled',
        category: args.data.category || 'autre',
        fileType: args.data.fileType || null,
        fileSize: args.data.fileSize || null,
        fileUrl: args.data.fileUrl || null,
        status: args.data.status || 'recu',
        version: args.data.version || 1,
        expiresAt: args.data.expiresAt || null,
        uploadedById: args.data.uploadedById || null,
        sharedWithClient: Boolean(args.data.sharedWithClient),
        downloadToken: args.data.downloadToken || null,
        notes: args.data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        case: caseRecord ? { id: caseRecord.id, reference: caseRecord.reference, clientId: caseRecord.clientId, organizationId: caseRecord.organizationId } : null,
      }

      this.documents.set(id, doc)
      return doc
    },

    findUnique: async (args: { where: { id: string }; include?: Record<string, boolean> }): Promise<MockDocument | null> => {
      const doc = this.documents.get(args.where.id)
      if (!doc) return null

      if (doc.caseId) {
        const c = this.cases.get(doc.caseId)
        doc.case = c ? { id: c.id, reference: c.reference, clientId: c.clientId, organizationId: c.organizationId } : null
      }
      return { ...doc }
    },

    findFirst: async (args: { where?: Record<string, unknown>; select?: Record<string, boolean> }): Promise<MockDocument | null> => {
      for (const doc of this.documents.values()) {
        let match = true
        if (args.where) {
          for (const [key, value] of Object.entries(args.where)) {
            if ((doc as Record<string, unknown>)[key] !== value) {
              match = false
              break
            }
          }
        }
        if (match) return { ...doc }
      }
      return null
    },

    findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<MockDocument[]> => {
      let results = Array.from(this.documents.values())

      if (args?.where) {
        results = results.filter((doc) => {
          for (const [key, value] of Object.entries(args.where!)) {
            if (key === 'case') {
              const caseWhere = value as Record<string, unknown>
              if (caseWhere.clientId && doc.case?.clientId !== caseWhere.clientId) {
                return false
              }
            } else if ((doc as Record<string, unknown>)[key] !== value) {
              return false
            }
          }
          return true
        })
      }

      return results.map((d) => {
        if (d.caseId) {
          const c = this.cases.get(d.caseId)
          d.case = c ? { id: c.id, reference: c.reference, clientId: c.clientId, organizationId: c.organizationId } : null
        }
        return { ...d }
      })
    },

    delete: async (args: { where: { id: string } }): Promise<MockDocument> => {
      const doc = this.documents.get(args.where.id)
      if (!doc) throw new Error(`Document ${args.where.id} not found`)
      this.documents.delete(args.where.id)
      return doc
    },

    count: async (): Promise<number> => {
      return this.documents.size
    },
  }

  // --- Organization CRUD ---

  public organization = {
    findFirst: async (args?: { where?: { isActive?: boolean } }): Promise<MockOrganization | null> => {
      for (const org of this.organizations.values()) {
        if (args?.where?.isActive !== undefined && org.isActive !== args.where.isActive) {
          continue
        }
        return { ...org }
      }
      return null
    },
  }

  // --- Case CRUD ---

  public case = {
    findUnique: async (args: { where: { id: string }; select?: Record<string, boolean> }): Promise<MockCase | null> => {
      const c = this.cases.get(args.where.id)
      return c ? { ...c } : null
    },

    findFirst: async (args: { where: { id?: string; reference?: string; organizationId?: string } }): Promise<MockCase | null> => {
      for (const c of this.cases.values()) {
        if (args.where.id && c.id !== args.where.id) continue
        if (args.where.reference && c.reference !== args.where.reference) continue
        if (args.where.organizationId && c.organizationId !== args.where.organizationId) continue
        return { ...c }
      }
      return null
    },

    create: async (args: { data: Partial<MockCase> }): Promise<MockCase> => {
      const id = args.data.id || generateId('case')
      const c: MockCase = {
        id,
        reference: args.data.reference || 'DOS-2026-NEW',
        organizationId: args.data.organizationId || 'org-test-01',
        clientId: args.data.clientId || null,
        status: args.data.status || 'en_cours',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      this.cases.set(id, c)
      return c
    },
  }
}

export const mockDb = new MockPrismaDatabase()
