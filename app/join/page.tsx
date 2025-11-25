"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogInIcon } from "lucide-react"

export default function JoinExamPage() {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [error, setError] = useState("")

    const handleJoin = () => {
        if (!code.trim()) {
            setError("Vui lòng nhập mã phòng")
            return
        }

        // Mock validation
        // In a real app, we would check if the exam exists
        router.push(`/exam/${code}`)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Vào Phòng Thi</CardTitle>
                    <CardDescription>Nhập mã phòng thi do giáo viên cung cấp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Mã Phòng Thi</Label>
                        <Input
                            id="code"
                            placeholder="Ví dụ: CODE123"
                            className="text-center text-lg uppercase tracking-widest"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value.toUpperCase())
                                setError("")
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleJoin}>
                        <LogInIcon className="mr-2 h-4 w-4" />
                        Vào Thi Ngay
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
