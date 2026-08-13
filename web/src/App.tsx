import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Counter</CardTitle>
          <CardDescription>A shadcn/ui card with a button and label.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="count">Count: {count}</Label>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="secondary" onClick={() => setCount(0)}>
            Reset
          </Button>
          <Button onClick={() => setCount((count) => count + 1)}>
            Increment
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export default App
