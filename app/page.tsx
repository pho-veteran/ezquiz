import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpenIcon, PenToolIcon } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
            EQuiz - Tạo Đề Thi Bằng AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Nền tảng tạo và làm bài thi trắc nghiệm thông minh, nhanh chóng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* Teacher Flow */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <PenToolIcon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Giáo Viên</CardTitle>
              <CardDescription>Tạo đề thi mới từ tài liệu hoặc văn bản</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="w-full" size="lg">
                  Tạo Đề Thi Ngay
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Student Flow */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BookOpenIcon className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Học Sinh</CardTitle>
              <CardDescription>Tham gia làm bài thi với mã phòng</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/join">
                <Button variant="outline" className="w-full" size="lg">
                  Vào Thi
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
