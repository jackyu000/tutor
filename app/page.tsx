//import Image from "next/image";
import Chat from './components/Chat';

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="p-8 pt-16">
        <h1 className="text-4xl font-bold text-center mb-12">GPT Chatbot</h1>
        <Chat />
      </main>
    </div>
  );
}
