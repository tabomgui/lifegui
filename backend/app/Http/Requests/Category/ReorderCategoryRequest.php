<?php
namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderCategoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array'],
            // Scoped to the logged-in user: an unscoped exists:categories,id would leak
            // whether ids belonging to OTHER users exist, and would let them slip into
            // the reorder batch. Rejecting them here (422) is the fix.
            'ids.*' => ['integer', Rule::exists('categories', 'id')->where('user_id', $this->user()->id)],
        ];
    }
}
