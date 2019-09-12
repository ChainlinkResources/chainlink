import request, { Response } from 'supertest'
import http from 'http'
import express from 'express'
import { Connection } from 'typeorm'
import { closeDbConnection, getDb } from '../../../database'
import { clearDb } from '../../testdatabase'
import { createAdmin } from '../../../support/admin'
import {
  createChainlinkNode,
  find as findNode,
} from '../../../entity/ChainlinkNode'
import adminNodes from '../../../controllers/admin/nodes'

const ADMIN_PATH: string = '/api/v1/admin'
const adminNodesPath = `${ADMIN_PATH}/nodes`

const app = express()
app.use(express.json())
app.use(ADMIN_PATH, adminNodes)

let server: http.Server
let db: Connection

beforeAll(async () => {
  db = await getDb()
  server = app.listen(null)
})
afterAll(async () => {
  if (server) {
    server.close()
    await closeDbConnection()
  }
})
beforeEach(async () => {
  await clearDb()
})

describe('POST /nodes', () => {
  it('can create a node and returns the generated information', done => {
    request(server)
      .post(adminNodesPath)
      .send({ name: 'nodeA', url: 'http://nodea.com' })
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect(201)
      .expect((res: Response) => {
        expect(res.body.id).toBeDefined()
        expect(res.body.accessKey).toBeDefined()
        expect(res.body.secret).toBeDefined()
      })
      .end(done)
  })

  it('returns an error with invalid params', done => {
    request(server)
      .post(adminNodesPath)
      .send({ url: 'http://nodea.com' })
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .expect(422)
      .expect((res: Response) => {
        const { errors } = res.body

        expect(errors).toBeDefined()
        expect(errors.name).toEqual({
          minLength: 'must be at least 3 characters',
        })
      })
      .end(done)
  })
})

describe('DELETE /nodes/:id', () => {
  function path(id: number): string {
    return `${adminNodesPath}/${id}`
  }

  it('can delete a node', async done => {
    const [node, _] = await createChainlinkNode(db, 'nodeA')

    request(server)
      .delete(path(node.id))
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(async () => {
        const nodeAfter = await findNode(db, node.id)
        expect(nodeAfter).not.toBeDefined()
      })
      .end(done)
  })
})
