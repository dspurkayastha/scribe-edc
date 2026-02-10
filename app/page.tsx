import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold">SCRIBE EDC</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Free, open-source, cloud-native EDC platform for clinical research
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
