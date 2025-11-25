import Navbar from "@/components/navbar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto py-8 px-4">{children}</main>
        </div>
    )
}
