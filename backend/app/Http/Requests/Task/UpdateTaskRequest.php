<?php
namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            // Scoped to the logged-in user: an unscoped exists:categories,id would leak
            // whether ids belonging to OTHER users exist, and would let a task reference
            // a foreign category. Rejecting them here (422) is the fix.
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('user_id', $this->user()->id)],
            'status' => ['sometimes', Rule::in(['todo', 'doing', 'done'])],
            'position' => ['sometimes', 'integer', 'min:0'],
            'due_date' => ['nullable', 'date_format:Y-m-d'],
        ];
    }
}
