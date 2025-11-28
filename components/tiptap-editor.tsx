"use client"

import { useEffect } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Markdown } from "@tiptap/markdown"
import Placeholder from "@tiptap/extension-placeholder"
import Mathematics from "@tiptap/extension-mathematics"

import { cn } from "@/lib/utils"

interface TipTapEditorProps {
    value: string
    onChange?: (value: string) => void
    editable?: boolean
    placeholder?: string
    className?: string
    minHeight?: string
    showBorder?: boolean
}

export function TipTapEditor({
    value,
    onChange,
    editable = false,
    placeholder = "Nhập nội dung...",
    className,
    minHeight = "120px",
    showBorder = true,
}: TipTapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown,
            Mathematics.configure({
                inlineOptions: {},
                blockOptions: {},
                katexOptions: {
                    throwOnError: false,
                    strict: "ignore",
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass:
                    "before:content-[attr(data-placeholder)] before:text-muted-foreground/70 before:pointer-events-none",
            }),
        ],
        content: value || "",
        contentType: "markdown",
        editable,
        autofocus: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: cn(
                    "focus:outline-none text-base leading-relaxed",
                    editable ? "px-4 py-3" : "prose prose-sm max-w-none"
                ),
                style: `min-height: ${minHeight}`,
            },
        },
        onUpdate: ({ editor }) => {
            if (!onChange) return
            try {
                const markdown =
                    ((editor as typeof editor & { getMarkdown?: () => string }).getMarkdown?.() ??
                        editor.getText())
                onChange(markdown)
            } catch {
                onChange(editor.getText())
            }
        },
    })

    useEffect(() => {
        if (!editor) return
        const current =
            ((editor as typeof editor & { getMarkdown?: () => string }).getMarkdown?.() ??
                editor.getText())
        if (value !== undefined && current !== value) {
            editor.commands.setContent(value || "", { contentType: "markdown" })
        }
    }, [editor, value])

    useEffect(() => {
        if (!editor) return
        editor.setEditable(editable)
        if (!editable) {
            editor.commands.blur()
        }
    }, [editor, editable])

    if (!editor) {
        return (
            <div
                className={cn(
                    "rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground",
                    className,
                )}
            >
                Đang khởi tạo trình soạn thảo…
            </div>
        )
    }

    return (
        <div className={cn(className)}>
            <div
                className={cn(
                    "rounded-md",
                    showBorder &&
                        (editable
                            ? "border border-border bg-background"
                            : "border border-border/40 bg-transparent")
                )}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    )
}


