import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// POST: Add a tag
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { tag } = await request.json();

    if (!tag) {
        return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    // Use SQL function or read-update-write. 
    // For simplicity and to avoid creating new SQL functions now, we'll do read-update-write
    // BUT array_append is better if possible. Supabase JS client supports working with arrays.

    // We can use the postgres update syntax: tags = array_append(tags, 'tag')
    // But supabase-js doesn't expose array_append directly in .update() easily without rpc
    // So reading current tags first is safer for now.

    const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("tags")
        .eq("id", id)
        .eq("merchant_id", user.id)
        .single();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let currentTags = customer.tags || [];
    if (!currentTags.includes(tag)) {
        currentTags.push(tag);
    } else {
        return NextResponse.json({ message: "Tag already exists", tags: currentTags });
    }

    const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update({ tags: currentTags })
        .eq("id", id)
        .eq("merchant_id", user.id)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedCustomer);
}

// DELETE: Remove a tag
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { tag } = await request.json();

    if (!tag) {
        return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("tags")
        .eq("id", id)
        .eq("merchant_id", user.id)
        .single();

    if (fetchError) {
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let currentTags = customer.tags || [];
    currentTags = currentTags.filter((t: string) => t !== tag);

    const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update({ tags: currentTags })
        .eq("id", id)
        .eq("merchant_id", user.id)
        .select()
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedCustomer);
}
