import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSubcategories, deleteSubcategory, getSubcategoryProductCount, type Subcategory } from "@/lib/supabase/subcategories";
import { getCategories, type Category } from "@/lib/supabase/categories";
import { SubcategoryForm } from "@/components/admin/SubcategoryForm";

export default function Subcategories() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subcats, cats] = await Promise.all([
        getSubcategories(),
        getCategories(),
      ]);
      setSubcategories(subcats);
      setCategories(cats);

      // Load product counts for each subcategory
      const counts: Record<string, number> = {};
      await Promise.all(
        subcats.map(async (subcat) => {
          const count = await getSubcategoryProductCount(subcat.id);
          counts[subcat.id] = count;
        })
      );
      setProductCounts(counts);
    } catch (error) {
      console.error("Error loading subcategories:", error);
      alert("Failed to load subcategories");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const handleDelete = async () => {
    if (!deletingSubcategory) return;

    try {
      await deleteSubcategory(deletingSubcategory.id);
      await loadData();
      setDeletingSubcategory(null);
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      if (error?.code === "23503") {
        alert("Cannot delete subcategory. There are products associated with this subcategory.");
      } else {
        alert("Failed to delete subcategory");
      }
    }
  };

  const filteredSubcategories = subcategories.filter((subcategory) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const categoryName = getCategoryName(subcategory.category_id).toLowerCase();
    return (
      subcategory.name.toLowerCase().includes(query) ||
      subcategory.slug.toLowerCase().includes(query) ||
      categoryName.includes(query)
    );
  });

  if (showForm || editingSubcategory) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingSubcategory ? "Edit Subcategory" : "Add New Subcategory"}
              </CardTitle>
              <CardDescription>
                {editingSubcategory
                  ? "Update subcategory information"
                  : "Create a new subcategory"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubcategoryForm
                subcategory={editingSubcategory || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingSubcategory(null);
                  loadData();
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingSubcategory(null);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subcategories Management</CardTitle>
                <CardDescription>
                  Manage product subcategories ({subcategories.length} subcategories)
                </CardDescription>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subcategories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading subcategories...</div>
            ) : filteredSubcategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "No subcategories found matching your search"
                  : "No subcategories yet. Click 'Add Subcategory' to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Parent Category</TableHead>
                      <TableHead>Product Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubcategories.map((subcategory) => (
                      <TableRow key={subcategory.id}>
                        <TableCell className="text-2xl">
                          {subcategory.icon || "📦"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {subcategory.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {subcategory.slug}
                        </TableCell>
                        <TableCell>
                          {getCategoryName(subcategory.category_id)}
                        </TableCell>
                        <TableCell>
                          {productCounts[subcategory.id] ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingSubcategory(subcategory)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeletingSubcategory(subcategory)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!deletingSubcategory}
        onOpenChange={(open) => !open && setDeletingSubcategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSubcategory?.name}"? This
              action cannot be undone. Products in this subcategory will also be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
