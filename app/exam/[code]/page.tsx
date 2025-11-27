"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ExamPage() {
    const params = useParams<{ code: string }>()
    const router = useRouter()
    const examCode = params.code

    useEffect(() => {
        // Redirect to join page - exams now require session creation
        router.replace(`/join?code=${examCode}`)
    }, [router, examCode])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card className="max-w-md">
                <CardContent className="pt-6 text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">
                        Đang chuyển hướng...
                    </p>
                            </CardContent>
                        </Card>
        </div>
    )
}
