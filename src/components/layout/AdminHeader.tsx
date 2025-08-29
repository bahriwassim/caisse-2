import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wrench, Home } from "lucide-react";

export default function AdminHeader() {
  return (
    <div className="flex h-14 w-full items-center justify-between">
       <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Wrench className="h-6 w-6 text-primary" />
          <span className="font-headline">Admin</span>
        </Link>
      <div className="flex items-center gap-2">
  {/* sidebar toggle removed for horizontal nav */}
        <Button variant="outline" size="icon" asChild>
            <Link href="/">
                <Home className="h-4 w-4" />
            </Link>
        </Button>
      </div>
    </div>
  );
}
