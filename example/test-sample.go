package main

import "time"

// @GqlType
// @GqlType(name:"PublicView")
// @GqlType(name:"AdminView")
// @GqlInput
type User struct {
	// Basic fields
	ID    string `gql:"id,ro"`
	Email string `gql:"email,required"`

	// Field with description
	Password string `gql:"password,wo,description:User password for authentication"`

	// Deprecated field
	OldField string `gql:"old_field,deprecated:Use newField instead"`

	// Type-specific inclusion
	InternalID string `gql:"internal_id,include:PublicView,omit:PublicView"`

	// Type-specific omission
	PrivateData string `gql:"private_data,omit:PublicView"`

	// Read-only for specific types
	CreatedAt time.Time `gql:"created_at,ro:'AdminView,PublicView'"`

	// Multiple access patterns
	Name string `gql:"name,rw:[UserInput,PublicView]"`
}

// @GqlType(name:"AdminView")
type AdminView struct {
	UserID     string    `gql:"user_id"`
	InternalID string    `gql:"internal_id"`
	CreatedAt  time.Time `gql:"created_at,rw"`
}

// @GqlType(name:"PublicView")
type PublicView struct {
	Name string `gql:"name"`
}

// @GqlEnum(name:"Role")
type Role string

const (
	RoleAdmin Role = "ADMIN"
	RoleUser  Role = "USER"
)

// @GqlIgnoreAll - This struct will be ignored
type InternalType struct {
	Secret string
}
