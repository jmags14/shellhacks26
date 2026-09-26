import { supabase } from "./lib/supabase";

function App() {

  async function testSignup() {
    const { data, error } = await supabase.auth.signUp({
      email: "test123@example.com",
      password: "TestPassword123!"
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);
  }

  return (
    <div>
      <h1>KitchenOS</h1>
      <button onClick={testSignup}>
        Test Supabase
      </button>
    </div>
  );
}

export default App;