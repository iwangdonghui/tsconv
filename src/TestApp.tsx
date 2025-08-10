// Test component for debugging

export default function TestApp() {
  console.log('TestApp component is rendering');

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>React Test App</h1>
      <p>If you can see this, React is working!</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
}
