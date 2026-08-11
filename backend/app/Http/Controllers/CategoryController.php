<?php
namespace App\Http\Controllers;

use App\Http\Requests\Category\ReorderCategoryRequest;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::orderBy('position')->orderBy('id')->get();
        return CategoryResource::collection($categories)->response();
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create([
            ...$request->validated(),
            'position' => (int) Category::max('position') + 1,
        ]);
        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    public function show(Category $category): JsonResponse
    {
        return (new CategoryResource($category))->response();
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $category->update($request->validated());
        return (new CategoryResource($category))->response();
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->delete();
        return response()->json(null, 204);
    }

    public function reorder(ReorderCategoryRequest $request): JsonResponse
    {
        foreach ($request->input('ids') as $position => $id) {
            Category::where('id', $id)->update(['position' => $position]);
        }
        return response()->json(null, 204);
    }
}
