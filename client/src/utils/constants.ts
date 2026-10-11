import { SupportedLanguage } from '../types/index.js';

export const LANGUAGE_CONFIGS: Record<
  SupportedLanguage,
  { label: string; monacoLang: string; extension: string; defaultCode: string }
> = {
  cpp: {
    label: 'C++ (Clang / G++ 17)',
    monacoLang: 'cpp',
    extension: '.cpp',
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to Smart Compiler!" << endl;
    cout << "Code. Understand. Fix. Learn." << endl;
    return 0;
}`
  },
  c: {
    label: 'C (GCC / Clang)',
    monacoLang: 'c',
    extension: '.c',
    defaultCode: `#include <stdio.h>

int main() {
    printf("Welcome to Smart Compiler in C!\\n");
    return 0;
}`
  },
  python: {
    label: 'Python (3.12)',
    monacoLang: 'python',
    extension: '.py',
    defaultCode: `# Welcome to Smart Compiler in Python
def greet():
    languages = ["C", "C++", "Python", "JavaScript"]
    print("Smart Compiler supports:", ", ".join(languages))

if __name__ == "__main__":
    greet()`
  },
  javascript: {
    label: 'JavaScript (Node.js)',
    monacoLang: 'javascript',
    extension: '.js',
    defaultCode: `// Welcome to Smart Compiler in JavaScript
function main() {
    const message = "A smarter way to write, run, understand and improve code.";
    console.log(message);
}

main();`
  },
  java: {
    label: 'Java (JDK)',
    monacoLang: 'java',
    extension: '.java',
    defaultCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to Smart Compiler in Java!");
    }
}`
  }
};

export const TEMPLATES: Record<string, { label: string; language: SupportedLanguage; code: string }[]> = {
  cpp: [
    {
      label: 'Hello World',
      language: 'cpp',
      code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`
    },
    {
      label: 'Binary Search',
      language: 'cpp',
      code: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> numbers = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;
    int index = binarySearch(numbers, target);
    cout << "Target " << target << " found at index: " << index << endl;
    return 0;
}`
    },
    {
      label: 'Factorial (Recursion)',
      language: 'cpp',
      code: `#include <iostream>
using namespace std;

long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n = 7;
    cout << "Factorial of " << n << " is: " << factorial(n) << endl;
    return 0;
}`
    }
  ],
  python: [
    {
      label: 'Hello World',
      language: 'python',
      code: `print("Hello, World!")`
    },
    {
      label: 'Fibonacci Sequence',
      language: 'python',
      code: `def fibonacci(n):
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib[:n]

print("First 10 Fibonacci numbers:", fibonacci(10))`
    },
    {
      label: 'Palindrome Checker',
      language: 'python',
      code: `def is_palindrome(text: str) -> bool:
    clean = "".join(ch.lower() for ch in text if ch.isalnum())
    return clean == clean[::-1]

samples = ["Racecar", "Hello", "A man a plan a canal Panama"]
for s in samples:
    print(f"'{s}' is palindrome: {is_palindrome(s)}")`
    }
  ],
  c: [
    {
      label: 'Hello World',
      language: 'c',
      code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`
    },
    {
      label: 'Array Bubble Sort',
      language: 'c',
      code: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    bubbleSort(arr, n);
    printf("Sorted array: ");
    for (int i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\\n");
    return 0;
}`
    }
  ]
};
