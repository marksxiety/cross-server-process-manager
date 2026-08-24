import { Tile } from './components/custom/Tile'
import { TileContainer } from './components/custom/TileContainer'
import type { ProcessInfo } from './types'
import processes from './data.json'

function App() {
  return (
    <main className='flex min-h-svh items-center justify-center p-4'>
      <TileContainer>
      {(processes as ProcessInfo[]).map((process) => (
        <Tile key={process.pid} process={process} />
      ))}
      </TileContainer>
    </main>
  )
}

export default App
