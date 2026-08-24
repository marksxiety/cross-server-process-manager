import { Tile } from './components/custom/Tile'
import { TileContainer } from './components/custom/TileContainer'
import { Button } from './components/ui/button'
import { Plus } from 'lucide-react'
import type { ProcessInfo } from './types'
import processes from './data.json'

function App() {
  const processList = processes as ProcessInfo[]

  return (
    <div className='min-h-svh bg-muted/30'>
      <header className='sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
        <div className='mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6'>
          <div className='flex flex-col'>
            <h1 className='text-lg font-semibold leading-tight tracking-tight'>XPM</h1>
            <p className='text-sm text-muted-foreground'>x-process-manager</p>
          </div>

          <div className='flex items-center gap-3'>
            <span className='hidden text-sm text-muted-foreground sm:inline'>
              {processList.length} process{processList.length === 1 ? '' : 'es'}
            </span>
            <Button size='sm'>
              <Plus className='size-4' />
              Add Process
            </Button>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6'>
        <TileContainer>
          {processList.map((process) => (
            <Tile key={process.pid} process={process} />
          ))}
        </TileContainer>
      </main>
    </div>
  )
}

export default App