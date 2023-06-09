import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import StreamZip from 'node-stream-zip'
import uuid from 'uuid-random'

/** @returns The current home directory of the user. */
const HOME = () => {
  // see bootstrap.js/ready
  return process.env.ODIN_USER_HOME
}
/** @returns The path where ODIN stores it's data. This may be changed by setting the
 * environment variable ODIN_HOME */
const ODIN_HOME = () => {
  if (process.env.ODIN_HOME !== undefined) return process.env.ODIN_HOME
  return path.join(HOME(), 'ODIN')
}

/** @returns The path where ODIN projects are located */
const ODIN_PROJECTS = () => path.join(ODIN_HOME(), 'projects')

const ODIN_LAYERS = 'layers'
const ODIN_METADATA = 'metadata.json'
const ODIN_PREVIEW = 'preview.jpg'
const ODIN_DEFAULT_METADATA = () => ({
  name: 'untitled project',
  lastAccess: new Date()
})

const exists = projectPath => fs.existsSync(projectPath)

/**
 * @param {String} projectId
 * @returns {String} absolute path of the project; NOTE: this does not guaranteet that the path exists
 */
const pathFromId = projectId => {
  return path.join(ODIN_PROJECTS(), projectId)
}

const createProject = async (name = uuid()) => {
  const projectPath = path.join(ODIN_PROJECTS(), name)
  if (exists(projectPath)) return

  /* create subfolder structure, too */
  await fs.promises.mkdir(path.join(projectPath, ODIN_LAYERS), { recursive: true })
  await fs.promises.writeFile(path.join(projectPath, ODIN_METADATA), JSON.stringify(ODIN_DEFAULT_METADATA()))

  /* create empty default layer */
  const contents = '{"type":"FeatureCollection","features":[]}'
  const layerPath = path.join(projectPath, ODIN_LAYERS, 'Default Layer.json') // TODO: i18n
  await fs.promises.writeFile(layerPath, contents)

  return projectPath
}

const deleteProject = async (projectPath) => {
  if (!exists(projectPath)) return

  /*
    The function fs.rmdir has a parameter { recursive: true }. As of NodeJs v12 this param
    is tagged 'experimental' and should not be used in production. Thus we need to use our own
    implementation.
  */
  const rmd = async dir => {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    /* process all dir entries in parallel */
    const results = await Promise.all(entries.map(entry => {
      const fullPath = path.join(dir, entry.name)
      const action = entry.isDirectory() ? rmd(fullPath) : fs.promises.unlink(fullPath)
      /* returns 'undefined' if action was successful, { error } otherwise */
      return action.catch(error => ({ error }))
    }))
    results.forEach(result => {
      if (result && result.error.code !== 'ENOENT') throw result.error
    })
    await fs.promises.rmdir(dir)
  }

  try {
    return rmd(projectPath)
  } catch (error) {
    console.dir(error)
  }
}

const exportProject = async (projectPath, targetFilePath) => {
  if (!exists(projectPath)) return
  const output = fs.createWriteStream(targetFilePath)
  const odinArchive = archiver('zip', { zlib: { level: 7 } })
  odinArchive.on('error', error => {
    throw error
  })
  /* the content of the project folder will be put into the root of the archive */
  odinArchive.pipe(output)
  odinArchive.directory(projectPath, false)
  return odinArchive.finalize().then(() => odinArchive.removeAllListeners())
}

const importProject = async (sourceFilePath) => {
  if (!exists(sourceFilePath)) return
  /*
    Since all the project related content is in the root of the archive
    we create a uuid for the imported one
  */
  const targetPath = path.join(ODIN_PROJECTS(), uuid())
  await fs.promises.mkdir(targetPath)

  return new Promise((resolve, reject) => {
    const zip = new StreamZip({ file: sourceFilePath })
    zip.on('ready', () => {
      zip.extract(null, targetPath, (error, count) => {
        zip.close()
        if (error) return reject(error)
        return resolve(count)
      })
    })
  })
}

const enumerateProjects = async () => {
  const enumerateDirectoryEntries = fs.promises.readdir(ODIN_PROJECTS(), { withFileTypes: true })
  const foldersOnly = dirEntries => dirEntries.filter(dirEntry => dirEntry.isDirectory())
  const constructPath = dirEntries => dirEntries.map(entry => path.join(ODIN_PROJECTS(), entry.name))
  return enumerateDirectoryEntries
    .then(foldersOnly)
    .then(constructPath)
}

const readMetadata = async (projectPath) => {
  if (!exists(projectPath)) return { path: projectPath, metadata: ODIN_DEFAULT_METADATA }
  try {
    const content = await fs.promises.readFile(path.join(projectPath, ODIN_METADATA))
    const metadata = JSON.parse(content)
    return {
      path: projectPath,
      metadata
    }
  } catch (error) {
    console.error(error)
    return { path: projectPath, metadata: ODIN_DEFAULT_METADATA, error: error.message }
  }
}

const writeMetadata = async (projectPath, metadata) => {
  if (!exists(projectPath)) {
    console.error(`project path does not exist ${projectPath}`)
    return
  }
  try {
    const content = JSON.stringify(metadata)
    await fs.promises.writeFile(path.join(projectPath, ODIN_METADATA), content)
  } catch (error) {
    console.error(error)
  }
}

const mergeMetadata = async (projectPath, kv) => {
  const { metadata } = await readMetadata(projectPath)
  if (!metadata) return

  const newMetadata = { ...metadata, ...kv }
  await writeMetadata(projectPath, newMetadata)
}

const readPreview = async (projectPath, options = { encoding: 'base64' }) => {
  if (!exists(projectPath)) {
    console.error(`project path does not exist ${projectPath}`)
    return
  }
  try {
    return await fs.promises.readFile(path.join(projectPath, ODIN_PREVIEW), options)
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(error)
  }
}

const writePreview = async (projectPath, jpgImageBuffer) => {
  if (!exists(projectPath)) {
    console.error(`project path does not exist ${projectPath}`)
    return
  }
  try {
    await fs.promises.writeFile(path.join(projectPath, ODIN_PREVIEW), jpgImageBuffer)
  } catch (error) {
    console.error(error)
  }
}

export default {
  exists,
  pathFromId,
  createProject,
  deleteProject,
  exportProject,
  importProject,
  enumerateProjects,
  readMetadata,
  writeMetadata,
  mergeMetadata,
  readPreview,
  writePreview
}
