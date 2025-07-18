
import { ThemeProvider } from './contexts/ThemeContext'
import TimestampConverter from './components/TimestampConverter'

function App() {
  return (
    <ThemeProvider>
      <TimestampConverter />
    </ThemeProvider>
  )
}

export default App
